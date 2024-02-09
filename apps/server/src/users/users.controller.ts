import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";

@Controller("users")
export class UsersController {
  @Get()
  getUsers() {
    return { username: "ramon", email: "ramon@users.com" };
  }

  @Get("posts")
  getUserPosts() {
    return [];
  }

  @Post("create")
  createUser(@Body() userData: { username: string; email: string }) {
    return { userData };
  }

  @Get(":id/:postId")
  getPostsByUserId(@Param("id") id: string, @Param("postId") postId: string) {
    console.log(id);
    return { id, postId };
  }

  @Get(":id")
  getSortedUsersById(@Param("id") id: string, @Query("sortBy") sortBy: string) {
    console.log(id, sortBy);
    return { id, sortBy };
  }
}
