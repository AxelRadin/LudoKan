import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import UsersTable from '../../components/admin/UsersTable';

export default function UsersAdmin() {
  return (
    <AdminLayout>
      <AdminPageHeader title="Gestion des utilisateurs" />
      <UsersTable />
    </AdminLayout>
  );
}
