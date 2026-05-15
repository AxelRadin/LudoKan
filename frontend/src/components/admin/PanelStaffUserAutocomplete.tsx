import type { AdminEntityPick } from '../../types/adminReviews';
import { userPick } from '../../utils/adminMappers';
import AdminRemoteAutocomplete from './AdminRemoteAutocomplete';

type Props = Readonly<{
  value: AdminEntityPick | null;
  onChange: (next: AdminEntityPick | null) => void;
}>;

export default function PanelStaffUserAutocomplete({ value, onChange }: Props) {
  return (
    <AdminRemoteAutocomplete
      label="Acteur (modérateur / admin)"
      placeholder="Pseudo ou e-mail (2+ car.)"
      helperText="Uniquement les comptes avec un rôle panel."
      value={value}
      onChange={onChange}
      mapper={userPick}
      searchUrl={debounced => {
        const p = new URLSearchParams();
        p.set('search', debounced);
        p.set('panel_staff_only', '1');
        p.set('page_size', '30');
        return `/api/admin/users/?${p.toString()}`;
      }}
    />
  );
}
