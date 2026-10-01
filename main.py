from fastapi import FastAPI, HTTPException, status
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from database import init_db, get_db_connection
import sqlite3

app = FastAPI(title="Student Management System API")

# Initialize database schema at launch
init_db()

# --- Validation Schemas ---
class StudentCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Name cannot be empty")
    roll_number: str = Field(..., min_length=1, max_length=30, description="Roll number cannot be empty")
    age: int = Field(..., gt=0, lt=150, description="Age must be a positive valid integer")
    course: str = Field(..., min_length=1, max_length=100, description="Course name cannot be empty")
    email: EmailStr = Field(..., description="Must be a structurally valid email format")

class StudentUpdateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    roll_number: str = Field(..., min_length=1, max_length=30)
    age: int = Field(..., gt=0, lt=150)
    course: str = Field(..., min_length=1, max_length=100)
    email: EmailStr

# --- CRUD Routing Infrastructure ---

@app.post("/api/students", status_code=status.HTTP_201_CREATED)
def create_student(student: StudentCreateSchema):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO students (name, roll_number, age, course, email) VALUES (?, ?, ?, ?, ?)",
            (student.name, student.roll_number, student.age, student.course, student.email)
        )
        conn.commit()
        return {"message": f"Student '{student.name}' added successfully!"}
    except sqlite3.IntegrityError as e:
        error_msg = str(e).lower()
        if "roll_number" in error_msg:
            raise HTTPException(status_code=400, detail="Registration failed: Roll number is already registered.")
        elif "email" in error_msg:
            raise HTTPException(status_code=400, detail="Registration failed: Email address is already in use.")
        else:
            raise HTTPException(status_code=400, detail="Database integrity violation occurred.")
    finally:
        conn.close()

@app.get("/api/students")
def read_all_students():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.put("/api/students/{student_id}")
def update_student(student_id: int, student: StudentUpdateSchema):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM students WHERE id = ?", (student_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Update failed: Target student record not found.")
        
    try:
        cursor.execute(
            "UPDATE students SET name = ?, roll_number = ?, age = ?, course = ?, email = ? WHERE id = ?",
            (student.name, student.roll_number, student.age, student.course, student.email, student_id)
        )
        conn.commit()
        return {"message": "Student information updated successfully!"}
    except sqlite3.IntegrityError as e:
        error_msg = str(e).lower()
        if "roll_number" in error_msg:
            raise HTTPException(status_code=400, detail="Update failed: Roll number conflicts with another student.")
        elif "email" in error_msg:
            raise HTTPException(status_code=400, detail="Update failed: Email address conflicts with another student.")
        else:
            raise HTTPException(status_code=400, detail="Database constraints failed.")
    finally:
        conn.close()

@app.delete("/api/students/{student_id}")
def delete_student(student_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM students WHERE id = ?", (student_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Deletion failed: Target student record not found.")
        
    cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    return {"message": "Student record permanently deleted from database."}

# Mount frontend files at the root route
app.mount("/", StaticFiles(directory="static", html=True), name="static")
