from fastapi import FastAPI

app = FastAPI(title="RS Recruitment API")


@app.get("/")
def read_root():
    return {"message": "Welcome to RS Recruitment API!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
