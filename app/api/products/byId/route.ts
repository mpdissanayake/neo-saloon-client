import { ProductStatus } from '@/app/generated/prisma/enums';
import { Product } from './../../../generated/prisma/models/Product';
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { isPrivileged } from '@/utils/authentication';

export async function GET (request : NextRequest){
    const id = request.nextUrl.searchParams.get("id")

    if(id == null) {
        return NextResponse.json({message : "Product Id is Required"}, {status :400})
    }

    try{

        const product = await prisma.product.findUnique({
            where : {
                id :id
            }
        })
        
        if(product == null){

            return NextResponse.json({message : "Product not Found"},{status : 404})

        }

        if (product.status == ProductStatus.DELETED){
            return NextResponse.json({message : "Product not Found"},{status: 404})
            
        }

        if (product.status == ProductStatus.INACTIVE){

            const hasPrivilage =await isPrivileged(request, "Products:read")
            
            if(!hasPrivilage){
                return NextResponse.json({ message : "product not found"},{status : 404})

            }
        }

        return NextResponse.json(product,{status:200})
    }catch(error){
        
        return NextResponse.json({message : "internal server error"})

    }    
}