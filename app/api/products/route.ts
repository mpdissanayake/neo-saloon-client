import { NextRequest, NextResponse } from "next/server";
import { isPrivileged } from "@/utils/authentication";
import ProductCreationRequestSchema, { MediaArraySchema } from "@/types/dto/ProductCreationRequest";
import z from "zod";
import prisma from "@/lib/prisma";
import getPageinationInfo from "@/utils/pageinforRetrieval";
import { ProductStatus } from "@/app/generated/prisma/enums";
import ProductUpdateRequestSchema from "@/types/dto/ProductUpdateRequest";

export async function GET(request: NextRequest) {
    const params = getPageinationInfo(request);
    const hasPrivilege = await isPrivileged(request, "products:read");

    if (hasPrivilege) {
        const totalProducts = await prisma.product.count({
            where: {
                NOT: {
                    status: ProductStatus.DELETED
                }
            }
        });

        const totalPages = Math.ceil(totalProducts / params.pageSize);

        const products = await prisma.product.findMany({
            skip: (params.pageNumber - 1) * params.pageSize,
            take: params.pageSize,
            include: {
                media: true
            },
            where: {
                NOT: {
                    status: ProductStatus.DELETED
                }
            }
        });

        return NextResponse.json({
            message: "Products fetched successfully",
            products: products,
            pagination: {
                pageNumber: params.pageNumber,
                pageSize: params.pageSize,
                totalPages: totalPages,
                totalCount: totalProducts
            }
        });
    } else {
        const totalProducts = await prisma.product.count({
            where: {
                status: ProductStatus.ACTIVE
            }
        });

        const totalPages = Math.ceil(totalProducts / params.pageSize);

        const products = await prisma.product.findMany({
            skip: (params.pageNumber - 1) * params.pageSize,
            take: params.pageSize,
            include: {
                media: true
            },
            where: {
                status: ProductStatus.ACTIVE
            }
        });

        return NextResponse.json({
            message: "Products fetched successfully",
            products: products,
            pagination: {
                pageNumber: params.pageNumber,
                pageSize: params.pageSize,
                totalPages: totalPages,
                totalCount: totalProducts
            }
        });
    }
}

export async function POST(request: NextRequest) {
    const hasPrivilege = await isPrivileged(request, "products:add");

    if (!hasPrivilege) {
        return NextResponse.json(
            { message: "You do not have the privilege to add products" },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const parsedBody = ProductCreationRequestSchema.parse(body);

        await prisma.product.create({
            data: {
                sku: parsedBody.sku,
                name: parsedBody.name,
                lltNames: parsedBody.altNames, // Prisma schema එකට අනුව lltNames විය යුතුයි
                description: parsedBody.description,
                stock: parsedBody.stock,
                status: parsedBody.status,
                price: parsedBody.price,
                compareAt: parsedBody.compareAt,
                brand: parsedBody.brand,
                model: parsedBody.model,
                media: {
                    create: parsedBody.media
                }
            }
        });

        return NextResponse.json(
            { message: "Product created successfully" },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: error.issues[0].message ?? "Invalid input" },
                { status: 400 }
            );
        }

        console.error("POST Error:", error);
        return NextResponse.json(
            { message: "INTERNAL SERVER ERROR" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    const hasPrivilege = await isPrivileged(request, "products:delete");

    if (!hasPrivilege) {
        return NextResponse.json(
            { message: "You do not have the required privilege to delete a product" },
            { status: 403 }
        );
    }

    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
        return NextResponse.json(
            { message: "Product id is required" },
            { status: 400 }
        );
    }

    try {
        const existingProduct = await prisma.product.findUnique({
            where: { id: id }
        });

        if (!existingProduct) {
            return NextResponse.json(
                { message: "Product not found" },
                { status: 404 }
            );
        }

        await prisma.product.update({
            where: { id: id },
            data: {
                status: ProductStatus.DELETED
            }
        });

        return NextResponse.json(
            { message: "Product Deleted Successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("DELETE Error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    const hasPrivilege = await isPrivileged(request, "products:edit");

    if (!hasPrivilege) {
        return NextResponse.json(
            { message: "You do not have the required privilege to update product" },
            { status: 403 }
        );
    }

    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
        return NextResponse.json(
            { message: "Product id is required" },
            { status: 400 }
        );
    }

    try {
        const body = await request.json();
        const parsedBody = ProductUpdateRequestSchema.parse(body);

        const existingProduct = await prisma.product.findUnique({
            where: { id: id }
        });

        if (!existingProduct) {
            return NextResponse.json(
                { message: "Product Not found" },
                { status: 404 }
            );
        }

        if (existingProduct.status === "DELETED" || existingProduct.status === ProductStatus.DELETED) {
            return NextResponse.json(
                { message: "Cannot update a deleted product" },
                { status: 400 }
            );
        }

        await prisma.product.update({
            where: { id: id },
            data: {
                sku: parsedBody.sku || existingProduct.sku,
                name: parsedBody.name || existingProduct.name,
                lltNames: parsedBody.altNames ?? existingProduct.lltNames,
                stock: parsedBody.stock ?? existingProduct.stock,
                status: parsedBody.status || existingProduct.status,
                price: parsedBody.price ?? existingProduct.price,
                compareAt: parsedBody.compareAt ?? existingProduct.compareAt,
                brand: parsedBody.brand || existingProduct.brand,
                model: parsedBody.model || existingProduct.model,
            }
        });

        if (parsedBody.media && parsedBody.media.length > 0) {
            const parsedMediaArray = MediaArraySchema.parse(parsedBody.media);

            await prisma.media.deleteMany({
                where: {
                    productIdentification: id
                }
            });

            await prisma.product.update({
                where: { id: id },
                data: {
                    media: {
                        create: parsedMediaArray
                    }
                }
            });
        }

        return NextResponse.json(
            { message: "Product Updated Successfully" },
            { status: 200 }
        );

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: error.issues[0]?.message ?? "Invalid input" },
                { status: 400 }
            );
        }

        // SKU එක දැනටමත් පවතී නම්
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { message: "A product with this SKU already exists" },
                { status: 409 }
            );
        }

        console.error("PUT Error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}