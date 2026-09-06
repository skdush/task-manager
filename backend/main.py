from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime

from database import engine, Base, SessionLocal
import models


Base.metadata.create_all(bind=engine)

app = FastAPI()


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.0.18:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Подключение к базе данных
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Главная страница
@app.get("/")
def home():
    return {"message": "Task Manager API работает!"}


# Создание задачи
@app.post("/tasks")
def create_task(
    title: str,
    description: str = "",
    priority: str = "medium",
    due_date: datetime | None = None,
    db: Session = Depends(get_db)
):
    # Проверка названия
    if not title.strip():
        raise HTTPException(
            status_code=400,
            detail="Название задачи не может быть пустым"
        )

    # Проверка приоритета
    if priority not in ["low", "medium", "high"]:
        raise HTTPException(
            status_code=400,
            detail="Приоритет должен быть low, medium или high"
        )

    task = models.Task(
        title=title.strip(),
        description=description,
        priority=priority,
        due_date=due_date
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task


# Получение задач
@app.get("/tasks")
def get_tasks(
    search: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    sort_by: str = "id",
    db: Session = Depends(get_db)
):
    # Проверка статуса
    if status and status not in ["todo", "in_progress", "done"]:
        raise HTTPException(
            status_code=400,
            detail="Некорректный статус задачи"
        )

    # Проверка приоритета
    if priority and priority not in ["low", "medium", "high"]:
        raise HTTPException(
            status_code=400,
            detail="Некорректный приоритет"
        )

    query = db.query(models.Task)

    # Поиск
    if search:
        query = query.filter(
            (models.Task.title.contains(search)) |
            (models.Task.description.contains(search))
        )

    # Фильтр по статусу
    if status:
        query = query.filter(
            models.Task.status == status
        )

    # Фильтр по приоритету
    if priority:
        query = query.filter(
            models.Task.priority == priority
        )

    # Сортировка
    if sort_by == "priority":
        query = query.order_by(models.Task.priority)

    elif sort_by == "due_date":
        query = query.order_by(models.Task.due_date)

    elif sort_by == "title":
        query = query.order_by(models.Task.title)

    else:
        query = query.order_by(models.Task.id)

    return query.all()


# Изменение задачи
@app.put("/tasks/{task_id}")
def update_task(
    task_id: int,
    title: str,
    description: str = "",
    status: str = "todo",
    priority: str = "medium",
    due_date: datetime | None = None,
    db: Session = Depends(get_db)
):
    # Проверка названия
    if not title.strip():
        raise HTTPException(
            status_code=400,
            detail="Название задачи не может быть пустым"
        )

    # Проверка статуса
    if status not in ["todo", "in_progress", "done"]:
        raise HTTPException(
            status_code=400,
            detail="Некорректный статус задачи"
        )

    # Проверка приоритета
    if priority not in ["low", "medium", "high"]:
        raise HTTPException(
            status_code=400,
            detail="Некорректный приоритет"
        )

    # Поиск задачи
    task = db.query(models.Task).filter(
        models.Task.id == task_id
    ).first()

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Задача не найдена"
        )

    # Обновление данных
    task.title = title.strip()
    task.description = description
    task.status = status
    task.priority = priority
    task.due_date = due_date

    db.commit()
    db.refresh(task)

    return task


# Удаление задачи
@app.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    # Поиск задачи
    task = db.query(models.Task).filter(
        models.Task.id == task_id
    ).first()

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Задача не найдена"
        )

    db.delete(task)
    db.commit()

    return {"message": "Задача удалена"}