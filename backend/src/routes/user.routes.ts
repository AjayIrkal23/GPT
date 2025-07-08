import { FastifyInstance } from "fastify";
import {
  createUser,
  loginUser,
  logoutUser,
  editUser,
  deleteUser,
} from "../controllers/user.controller";

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.post("/", createUser); // POST /users
  fastify.post("/login", loginUser); // POST /users/login
  fastify.post("/logout", logoutUser); // POST /users/logout
  fastify.patch("/:employeeId", editUser); // PATCH /users/:employeeId
  fastify.delete("/:employeeId", deleteUser); // DELETE /users/:employeeId
}
