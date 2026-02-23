import Navbar from "@/components/common/navbar/navbar";

const Layout: React.FC = ({ children }: any) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
