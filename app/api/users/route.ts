import prisma from "@/lib/prisma";
import { getUser, isPrivileged } from "@/utils/authentication";
import bcrypt from "bcryptjs";
import { count } from "console";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) { 
    
    const havePrivilege = await isPrivileged(request,"users:read");

    if(!havePrivilege){
        return NextResponse.json(
            {
                message : "You do not have the privilege to view users",
            },
            { 
                status : 403 
            }
        );
    }
    
const pageNumberInString = request.nextUrl.searchParams.get("pageNumber") || "1";
const pageSizeInString = request.nextUrl.searchParams.get("pageSize") || "10";

const pageNumber = parseInt(pageNumberInString);
const pageSize = parseInt(pageSizeInString);

const userCount = await prisma.user.count();
const totalPages =Math.ceil(userCount / pageSize);

if(pageNumber > totalPages){
    return NextResponse.json(
        {
            message : "Page number exceeds total pages",
        },
        {
            status : 400
        }
    );
}


console.log(
    {
     pageNumber : pageNumber,
     pageSize : pageSize, 
     userCount : userCount
    }
)
    const users = await prisma.user.findMany({
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select:{
            id  :true,
            email : true,
            phone : true,
            firstName :true,
            lastName : true,
            password :false,
            role :true,
            status :true,
            createdAt : true,
            lastLogin : true,
            privileges :true
        }          
    });

    return NextResponse.json(
            { 
                message :"Users fetched successfully",
                users : users,
                status: 200,
                pagination : {
                    pageNumber : pageNumber,
                    pageSize : pageSize,
                    totalPages : totalPages,
                    totalUsers : userCount
                }     
            }
    );

    

}
export async function POST(request: NextRequest) {
    //email, firstName, lastName,password, role,phone(optional),status

    const body = await request.json();

    if(body.email == null ){
        return NextResponse.json(
            {
                message : "Email is required",
            },
            { 
                status : 422 
            }
        );
    }

    if(body.firstName == null ){
        return NextResponse.json(
            {
                message : "First name is required",
            },
            { 
                status : 422 
            }
        );
    }
    if(body.lastName == null ){
        return NextResponse.json(
            {
                message : "Last name is required",
            },
            { 
                status : 422 
            }
        );
    }
    if(body.password == null ){
        return NextResponse.json(
            {
                message : "Password is required",
            },
            { 
                status : 422 
            }
        );
    }

    const existingUser = await prisma.user.findUnique({
        where : {
            email : body.email
        }
    });

    if (existingUser != null){
        return NextResponse.json(
            {
                message : "User with this email already exists",
            },
            { 
                status : 409 
            }
        );
    }

    const PasswordHash = await bcrypt.hash(body.password, 12);

    await prisma.user.create({
        data : {
            email : body.email,
            firstName : body.firstName,
            lastName : body.lastName,
            password : PasswordHash,
            phone : body.phone || null,            
        }
    });
    return NextResponse.json(
        {
            message : "User created successfully",
        }, 
        {
            status : 201
        }         
    )

}    

export async function PUT(request: NextRequest) {
    const id = request.nextUrl.searchParams.get("id");

    const requestUser = await getUser(request);

    if(requestUser == null){
        return NextResponse.json(
            {
                message : "You are not Logged in ",
            },
            { 
                status : 401 
            }
        );
    }

    const body = await request.json();

    if(requestUser.id == id){
        //try to update another user
        
        const user =await prisma.user.findUnique({
            where : {
                id : id 
            }
        });

        if (user == null) {
            return NextResponse.json(
                {
                    message : "User not found",
                },
                { 
                    status : 404 
                }
            );
        }

        await prisma.user.update({
            where : {
                id : id
            },
            data : {
                email : body.email || user.email,
                firstName : body.firstName || user.firstName,
                lastName : body.lastName || user.lastName,
                phone : body.phone || user.phone,
                profileImage : body.profileImage || user.profileImage,// shous be  included in the token
            }
        });
        return NextResponse.json(
            {
                message : "User updated successfully",
            },
            { 
                status : 200 
            }
        );

    }else{
        //user is trying to update someone else's account check if they have the privilege
        const havePrivilege = await isPrivileged(request,"users:edit");

        if(!havePrivilege){
            return NextResponse.json(
                {
                    message : "You do not have the privilege to edit other users",
                },
                { 
                    status : 403 
                }
            );
        }
        const user =await prisma.user.findUnique({
            where : {
                id : id || "00000" 

            }
        });

        if (user == null) {
            return NextResponse.json(
                {
                    message : "User not found",
                },
                { 
                    status : 404 
                }
            );
        }

        await prisma.user.update({
            where : {
                id : id || "00000"
            },
            data : {
                email : body.email || user.email,
                firstName : body.firstName || user.firstName,
                lastName : body.lastName || user.lastName,
                phone : body.phone || user.phone,
                profileImage : body.profileImage || user.profileImage,
                role : body.role || user.role,
                status : body.status || user.status,
                privileges : body.privileges || user.privileges,
            }
        });
        return NextResponse.json(
            {
                message : "User updated successfully",
            },
            { 
                status : 200 
            }
        );
    }    
}
