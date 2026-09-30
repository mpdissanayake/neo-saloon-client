import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    if (!body.password) {
      return NextResponse.json(
        { message: "Password is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" }, // ආරක්ෂාව සඳහා "User not found" වෙනුවට මෙය යෙදීම සුදුසුය
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Your account is not active. Please contact the administrator." },
        { status: 403 }
      );
    }

    const isPasswordValid = await compare(body.password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const secretText = process.env.JOSE_SECRET || "TemporarySecret8929%";
    const secret = new TextEncoder().encode(secretText);

    const token = await new jose.SignJWT({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      privileges: user.privileges,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d") // Token එක expire වන කාලය එක් කරන්න
      .sign(secret);

    const response = NextResponse.json(
      {
        message: "Login successful",
        role: user.role,
      },
      { status: 200 }
    );

    response.cookies.set({
      name: "login-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}