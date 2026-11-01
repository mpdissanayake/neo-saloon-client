import prisma from "@/lib/prisma";
import { UserRegistrationRequestSchema } from "@/types/dto/UserRegistrationRequest";
import type {UserRegistrationRequest} from "@/types/dto/UserRegistrationRequest";
import { UserSelfUpdateRequestSchema } from "@/types/dto/UserSelfUpdateRequest";
import { UserUpdatedByAdminRequestSchema } from "@/types/dto/UserUpdatedByAdminRequest";
import { getUser, isPrivileged } from "@/utils/authentication";
import getPageinationInfo from "@/utils/pageinforRetrieval";
import bcrypt from "bcryptjs";
import { count } from "console";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

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

const params = getPageinationInfo(request)

const userCount = await prisma.user.count();

const totalPages =Math.ceil(userCount / params.pageSize);

if(params.pageNumber > totalPages){
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
     pageNumber : params.pageNumber,
     pageSize : params.pageSize, 
     userCount : userCount
    }
)
    const users = await prisma.user.findMany({
        skip: (params.pageNumber - 1) * params.pageSize,
        take: params.pageSize,
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
                data : users,
                status: 200,
                pagination : {
                    pageNumber : params.pageNumber,
                    pageSize : params.pageSize,
                    totalPages : totalPages,
                    totalCount : userCount
                }     
            }
    );

    

}
export async function POST(request: NextRequest) {
    //email, firstName, lastName,password, role,phone(optional),status

    const body = await request.json();

    // validate the body using zod schema
    
   try {

        const parsedBody = UserRegistrationRequestSchema.parse(body);
       
            const existingUser = await prisma.user.findUnique(
            {
                where : {
                    email : body.email
                }
            }
        );

        if(existingUser != null){
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
     }catch (error) { 
        
        if(error instanceof z.ZodError){
            console.log(error.issues[0].message ?? "Invalid input  ");
            return NextResponse.json(
                {
                    message : error.issues[0].message ?? "Invalid input  ",
                },
                {
                    status : 400
                }
            );
        }


        console.log(error);
    return NextResponse.json(
        {
            message : "Invalid request body",
            error : error
        },
        {
            status : 400
        }
    );  
   }
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

    try {


        const body = await request.json();

        if(requestUser.id == id){
            //never allow user to update their own role, status or privileges                
            
            UserSelfUpdateRequestSchema.parse(body);
            
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

            UserUpdatedByAdminRequestSchema.parse(body);


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
    }catch (error) {

        if(error instanceof z.ZodError){
            return NextResponse.json(
                {
                    message :  error.issues[0].message ?? "Invalid input  " ,
                    
                },
                {
                    status : 400
                }

            );
        }

        return NextResponse.json(
            {
                message : "An error occurred while updating the user"
            },
            {
                status : 500
            }
        );
    }

       
}
