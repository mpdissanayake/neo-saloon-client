import { NextRequest } from "next/server";
import * as jose from "jose";

export async function GET(request : NextRequest) {
    const loginToken = request.cookies.get("login-token")?.value;

    const secretText = process.env.JOSE_SECRET || "TemporarySecret8929%";

    const secret = new TextEncoder().encode(secretText);

    const user = await jose.jwtVerify(
        loginToken,
        secret
    )
    console.log(user)

    
    console.log("GET request received at /api/products");
}