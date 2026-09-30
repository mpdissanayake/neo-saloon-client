import prisma from "@/lib/prisma";
import { getUser } from "@/utils/authentication";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {

    const  requestedUser = await getUser(request)

    if (requestedUser == null) {
        return NextResponse.json (
            
        {
            message: "you need to be logged in to access this resource",
        },

        {
            status: 401
        }
    )
    }

    console.log(requestedUser)

    if(requestedUser.privileges.includes("users:read")){
        
    

    const users =await prisma.user.findMany()
        return NextResponse.json(
            { 
                message :"Users fetched successfully",
                users : users,
                status: 200 
            }
);

}else{
    return NextResponse.json(
        {
            message: "you do not have the required privileges to access this resource",
        },
        {
            status: 403
        }
    )
}    

}               