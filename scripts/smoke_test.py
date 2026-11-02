"""
Проверка работоспособности ContentFlow AI после `docker compose up`.

Сценарий (демо-режим из .env.example):
  1. регистрация пользователя и подтверждение email кодом из лога rabbit_worker;
  2. создание бизнеса;
  3. генерация поста для бизнеса (MockLLMClient);
  плюс негативная проверка: запрос без токена получает 401.

Запуск из корня репозитория:  python scripts/smoke_test.py
Зависимости: только стандартная библиотека Python 3.10+ и docker compose.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

def _gateway_port() -> str:
    # Порт берётся из .env, как его использует docker compose
    try:
        with open(".env", encoding="utf-8") as f:
            for line in f:
                if line.startswith("API_GATEWAY_PORT="):
                    return line.split("=", 1)[1].strip()
    except FileNotFoundError:
        pass
    return "8080"


BASE_URL = os.getenv("SMOKE_BASE_URL", f"http://localhost:{_gateway_port()}/api/v1")
TIMEOUT_S = int(os.getenv("SMOKE_TIMEOUT", "120"))


def request(method: str, path: str, body: dict | None = None, token: str | None = None) -> tuple[int, dict]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE_URL + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except json.JSONDecodeError:
            return e.code, {}


def step(name: str, ok: bool, details: str = "") -> None:
    print(f"[{'OK' if ok else 'FAIL'}] {name}" + (f" — {details}" if details else ""))
    if not ok:
        sys.exit(1)


def wait_for_gateway() -> None:
    deadline = time.time() + TIMEOUT_S
    while time.time() < deadline:
        try:
            status, _ = request("GET", "/business")
            if status in (400, 401):
                return
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            pass
        time.sleep(2)
    step("API Gateway отвечает", False, f"нет ответа от {BASE_URL} за {TIMEOUT_S} с")


def read_verification_code(email: str) -> int:
    pattern = re.compile(rf"to={re.escape(email)} verification_code=(\d+)")
    deadline = time.time() + 60
    while time.time() < deadline:
        logs = subprocess.run(
            ["docker", "compose", "logs", "--no-color", "rabbit_worker"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        ).stdout
        match = pattern.search(logs)
        if match:
            return int(match.group(1))
        time.sleep(2)
    step("код подтверждения в логе rabbit_worker", False, "проверьте RABBITMQ_CONFIG__SMTP__MODE=console")
    raise SystemExit(1)


def main() -> None:
    wait_for_gateway()
    step("API Gateway отвечает", True, BASE_URL)

    suffix = int(time.time())
    email = f"smoke{suffix}@example.com"
    status, body = request("POST", "/auth/register", {
        "username": f"smoke{suffix}", "email": email, "password": "demo12345",
    })
    step("1. регистрация", status == 201, f"HTTP {status} {body.get('error', '')}")

    code = read_verification_code(email)
    status, body = request("POST", "/auth/confirm", {"email_token": body["email_confirm_token"], "code": code})
    token = body.get("access_token")
    step("1. подтверждение email", status == 200 and bool(token), f"HTTP {status}")

    status, body = request("POST", "/business/create", {
        "name": "Кофейня Smoke", "industry": "Еда и напитки", "region": "Москва",
        "description": "Кофейня у метро", "communication_style": "friendly",
    }, token=token)
    business_id = (body.get("business") or {}).get("id")
    step("2. создание бизнеса", status == 201 and bool(business_id), f"HTTP {status} {body.get('error', '')}")

    status, body = request("POST", f"/content/generate_post/{business_id}", {
        "description": "Анонс осеннего меню", "goal": 0, "tone": "friendly",
    }, token=token)
    step("3. генерация поста", status == 200 and bool(body.get("generated_post")), f"HTTP {status}")

    status, _ = request("POST", f"/content/generate_post/{business_id}", {"description": "x", "goal": 0})
    step("негативная проверка: без токена → 401", status == 401, f"HTTP {status}")

    print("Проверка пройдена.")


if __name__ == "__main__":
    main()
