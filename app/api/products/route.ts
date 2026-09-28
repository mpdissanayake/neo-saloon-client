import { NextRequest } from "next/server";
import * as jose from "jose";
import { getUser } from "@/utils/authentication";

export async function POST(request : NextRequest) {
    
    const user = getUser(request);

    
    console.log("GET request received at /api/products");
}