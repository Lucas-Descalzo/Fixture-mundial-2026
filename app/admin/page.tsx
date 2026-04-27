import { cookies } from "next/headers";

import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLogin } from "@/components/admin-login";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { getAdminDashboardData } from "@/lib/admin-service";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = isValidAdminSession(adminCookie);

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const data = await getAdminDashboardData();

  if (!data) {
    return <AdminLogin />;
  }

  return <AdminDashboard data={data} />;
}
