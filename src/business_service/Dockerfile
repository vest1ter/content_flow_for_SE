FROM python:3.13


ENV PYTHONPATH=/business_service

WORKDIR /business_service

RUN pip install --upgrade pip && \
    pip install poetry


COPY pyproject.toml poetry.lock ./


RUN poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi --no-root

COPY . .

CMD ["python", "server.py"]
