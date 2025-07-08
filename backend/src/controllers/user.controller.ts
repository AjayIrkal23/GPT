import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { IUser, UserModel } from "../models/user.model";

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

// Create new user
export const createUser = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { employeeId, password } = req.body as {
      employeeId: string;
      password: string;
    };

    const exists = await UserModel.findOne({ employeeId });
    if (exists) {
      return reply
        .status(409)
        .send({ success: false, message: "User already exists" });
    }

    const user = new UserModel({ employeeId, password });
    await user.save();

    return reply.send({
      success: true,
      message: "User created",
      userId: user._id,
    });
  } catch (err) {
    console.error(err);
    return reply
      .status(500)
      .send({ success: false, message: "Error creating user" });
  }
};

// Login user
export const loginUser = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { employeeId, password } = req.body as {
      employeeId: string;
      password: string;
    };

    const user = await UserModel.findOne({ employeeId });
    if (!user || !(await user.comparePassword(password))) {
      return reply
        .status(401)
        .send({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ employeeId }, JWT_SECRET);
    user.jwtoken = token;
    await user.save();

    return reply.send({ success: true, token, employeeId });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ success: false, message: "Login error" });
  }
};

// Logout user
export const logoutUser = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("Missing token");

    const payload = jwt.verify(token, JWT_SECRET) as { employeeId: string };

    const user = await UserModel.findOne({ employeeId: payload.employeeId });
    if (!user) {
      return reply
        .status(404)
        .send({ success: false, message: "User not found" });
    }

    user.jwtoken = "";
    await user.save();

    return reply.send({ success: true, message: "Logged out successfully" });
  } catch (err) {
    return reply
      .status(401)
      .send({ success: false, message: "Invalid or expired token" });
  }
};

// Edit user (partial update)
export const editUser = async (
  req: FastifyRequest<{ Params: { employeeId: string }; Body: Partial<IUser> }>,
  reply: FastifyReply
) => {
  try {
    const { employeeId } = req.params;
    const updateData = req.body;

    const result = await UserModel.updateOne(
      { employeeId },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return reply
        .status(404)
        .send({ success: false, message: "User not found or no changes" });
    }

    return reply.send({ success: true, message: "User updated" });
  } catch (err) {
    return reply
      .status(500)
      .send({ success: false, message: "Error updating user" });
  }
};
// Delete user
export const deleteUser = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { employeeId } = req.params as { employeeId: string };

    const result = await UserModel.deleteOne({ employeeId });
    if (result.deletedCount === 0) {
      return reply
        .status(404)
        .send({ success: false, message: "User not found" });
    }

    return reply.send({ success: true, message: "User deleted" });
  } catch (err) {
    return reply
      .status(500)
      .send({ success: false, message: "Error deleting user" });
  }
};
