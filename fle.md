# Fpark database handoff

Run `fpark_supabase_schema.sql` once in the Supabase SQL Editor.

## Registration form → `spaces`

Required fields:

- `title`
- `GPS coordinates e.g. 49°11'37.9"N 2°06'32.8"W`
- at least one of `hourly_price_pence`, `daily_price_pence`, `monthly_price_pence`
- `description/instructions`


Values supplied by the app rather than the user:

- `owner_id`: logged-in Supabase user's ID
- `status`: use `active` for the hackathon demo or `draft` if there is a review step
- `is_verified`: leave `false`

Example insert:


## THE EXMAPLE INSERT BELOW NEEDS UPDATING WITH THE NEWLY EDITED REQUIRED FIELDS!!!!

```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error("Not signed in")

const { data: space, error } = await supabase
  .from("spaces")
  .insert({
    owner_id: user.id,
    title: "Weekday driveway near town",
    address_line_1: "Example Road",
    parish: "St Helier",
    space_type: "driveway",
    max_vehicle_size: "medium",
    daily_price_pence: 700,
    monthly_price_pence: 13000,
    access_instructions: "Use the left-hand bay.",
    status: "active",
  })
  .select()
  .single()

if (error) throw error
```

## Availability → `space_availability`

`day_of_week` uses `0 = Monday` through `6 = Sunday`.

```ts
await supabase.from("space_availability").insert([
  { space_id: space.id, day_of_week: 0, start_time: "08:00", end_time: "18:00" },
  { space_id: space.id, day_of_week: 1, start_time: "08:00", end_time: "18:00" },
  { space_id: space.id, day_of_week: 2, start_time: "08:00", end_time: "18:00" },
  { space_id: space.id, day_of_week: 3, start_time: "08:00", end_time: "18:00" },
  { space_id: space.id, day_of_week: 4, start_time: "08:00", end_time: "18:00" },
])
```

## Prices

All prices are integer pence:

- £7.00 → `700`
- £130.00 → `13000`

Do not store money as a floating-point number.

## MVP behaviour

- The public can read active spaces.
- A user can create and edit only their own spaces.
- Drivers and hosts can read only bookings involving them.
- Overlapping pending/confirmed bookings for the same space are rejected by Postgres.
- For the prototype, bookings can be confirmed immediately.
- Before real payments, booking creation and price calculation must move into trusted server code.