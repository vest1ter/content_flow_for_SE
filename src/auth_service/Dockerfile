FROM python:3.13


ENV PYTHONPATH=/auth_service

WORKDIR /auth_service

RUN pip install --upgrade pip && \
    pip install poetry


COPY pyproject.toml poetry.lock ./


RUN poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi --no-root

COPY .env .env
COPY . .

CMD ["python", "server.py"]
