import {z} from "zod";

const UserRegistrationRequestSchema = z.object(
    {
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    password: z.string(),
    }
);
export type UserRegistrationRequest = z.infer<typeof UserRegistrationRequestSchema>;

export {UserRegistrationRequestSchema};
