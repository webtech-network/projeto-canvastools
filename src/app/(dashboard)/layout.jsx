import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { MobileNavProvider } from '@/components/MobileNavProvider';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

export default function DashboardLayout({ children }) {
  return (
    <MobileNavProvider>
      <ServiceWorkerRegistration />
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
