import Link from 'next/link';

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen grid grid-cols-12 gap-0">
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 border-r border-border p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Admin</h2>
          <p className="text-sm text-muted-foreground">Quản trị hệ thống</p>
        </div>
        <nav className="flex flex-col gap-2">
          
          <Link className="hover:text-primary" href="/admin">Tổng quan</Link>
          <Link className="hover:text-primary" href="/admin/users">Người dùng</Link>
          <Link className="hover:text-primary" href="/admin/jobs">Việc làm</Link>
          <Link className="hover:text-primary" href="/admin/disputes">Tranh chấp</Link>
          <Link className="hover:text-primary" href="/admin/profiles">Hồ sơ</Link>
          <Link className="hover:text-primary" href="/admin/settings">Cài đặt</Link>
          <Link className="hover:text-primary" href="/">← Về trang chủ</Link>
        </nav>
      </aside>
      <main className="col-span-12 md:col-span-9 lg:col-span-10 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}


