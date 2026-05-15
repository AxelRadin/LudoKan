import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import GamesTable from '../../components/admin/GamesTable';

export default function AdminGames() {
  return (
    <AdminLayout>
      <AdminPageHeader title="Catalogue jeux" />
      <GamesTable />
    </AdminLayout>
  );
}
