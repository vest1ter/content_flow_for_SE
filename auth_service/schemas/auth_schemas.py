from pydantic import BaseModel

class UserInfo(BaseModel):
    id: str
    username: str
    token_type: str