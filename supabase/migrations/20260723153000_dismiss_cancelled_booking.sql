alter table public.bookings
add column if not exists driver_hidden_at timestamptz;

create or replace function public.dismiss_cancelled_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
  set driver_hidden_at = now()
  where id = p_booking_id
    and driver_id = auth.uid()
    and status = 'cancelled'
    and driver_hidden_at is null;

  if not found then
    raise exception 'Cancelled booking not found or cannot be removed';
  end if;
end;
$$;

revoke all on function public.dismiss_cancelled_booking(uuid) from public;
grant execute on function public.dismiss_cancelled_booking(uuid) to authenticated;
