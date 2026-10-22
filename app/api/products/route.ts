import { NextRequest, NextResponse } from "next/server";
import { getUser, isPrivileged } from "@/utils/authentication";

export async function POST(request : NextRequest) {


}

export async function Post(request : NextRequest) {

    const hasPrivilege = await isPrivileged(request ,"products:add");


    if(hasPrivilege){

        const body = await request.json();

    }else {
        return  NextResponse.json("You do not have the privilege to add products",{status : 403});
    }
}


