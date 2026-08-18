import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { MobileNavProvider } from '@/components/MobileNavProvider';

export default function DashboardLayout({ children }) {
  return (
    <MobileNavProvider>
      <div className="dashboard-shell">
        <Sidebar />
        <div className="dashboard-main">
          <Topbar />
          <div className="dashboard-content">{children}</div>
        </div>
      </div>
    </MobileNavProvider>
  );
}
