import {redirect} from "next/navigation";

export const auth = async () => {
    return {
        user: {
            id: 'user_0',
            name: 'John Doe',
            email: 'john@example.com',
        },
        expires: (new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)).toString()
    };
};

export const signOut = async ({redirectTo}: { redirectTo: string }) => {
    localStorage.removeItem('token');
    redirect(redirectTo);
}

