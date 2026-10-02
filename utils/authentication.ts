import { NextRequest } from "next/server";
import * as jose from "jose";

export async function getUser(request : NextRequest){
    const loginToken = request.cookies.get("login-token")?.value;
    
        const secretText = process.env.JOSE_SECRET || "TemporarySecret8929%";
    
        const secret = new TextEncoder().encode(secretText);
    
        try {
            const user = await jose.jwtVerify(
                loginToken || "",
                secret
            );
            
            return user.payload;        
        } catch (error) {

            return null;

}
}
export async function isPrivileged(request : NextRequest, privilege  : string){
    const user = await getUser(request);
    if(user == null){
        return false;
    }
    if(user.privileges.includes(privilege)){
        return true;
    }else{
        return false;
    }

}
