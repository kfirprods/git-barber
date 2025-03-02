from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers from the routes folder
from routes.branches import router as branches_router
from routes.diff import router as diff_router
from routes.checkout import router as checkout_router
from routes.create_branch import router as create_branch_router
from routes.copy_files import router as copy_files_router
from routes.commit import router as commit_router
from routes.push import router as push_router
from routes.is_git_repo import router as is_git_repo_router
from routes.current_branch import router as current_branch_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include route routers
app.include_router(branches_router)
app.include_router(diff_router)
app.include_router(checkout_router)
app.include_router(create_branch_router)
app.include_router(copy_files_router)
app.include_router(commit_router)
app.include_router(push_router)
app.include_router(is_git_repo_router)
app.include_router(current_branch_router)
