import { ProfileClient } from "@/components/tenant/profile/ProfileClient";

export const metadata = {
  title: "User Profile | POS System",
  description: "View and update your personal information and security settings.",
};

export default function ProfilePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ProfileClient />
    </div>
  );
}
