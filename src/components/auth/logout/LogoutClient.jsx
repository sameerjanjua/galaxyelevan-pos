"use client";

import { useDispatch } from "react-redux";
import { logoutUser } from "@/store/auth/authThunks";
import { useRouter } from "next/navigation";

export default function LogoutClient() {
    const dispatch = useDispatch();
    const router = useRouter();

    const Logout = async () => {
        const result = await dispatch(logoutUser());
        if (logoutUser.fulfilled.match(result)) {
            router.push("/auth/login"); // redirect immediately
        } else {
            console.log("error logout");
            
        }
    }

    return (
        <button
            className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 cursor-pointer"
            onClick={Logout}
        >
            Logout
        </button>
    )
}