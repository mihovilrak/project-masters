import { Pool } from 'pg';
import { ActivityType, ActivityTypeUpdateInput } from '../types/activityType';
import { buildUpdateAssignments } from '../utils/sqlUpdate';

export const ALLOWED_ACTIVITY_TYPE_UPDATE_KEYS = [
  'name',
  'description',
  'color',
  'icon',
] as const;

// Activity Type Model
export const getActivityTypes = async (pool: Pool): Promise<ActivityType[]> => {
  const result = await pool.query(
    `SELECT * FROM activity_types
    WHERE active = true
    ORDER BY name ASC`,
  );
  return result.rows;
};

// Create Activity Type
export const createActivityType = async (
  pool: Pool,
  name: string,
  description: string | null,
  color: string,
  icon: string | null,
): Promise<ActivityType> => {
  const result = await pool.query(
    `INSERT INTO activity_types
    (name, description, color, icon)
    VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [name, description, color, icon],
  );
  return result.rows[0];
};

// Update Activity Type
export const updateActivityType = async (
  pool: Pool,
  id: string,
  updates: ActivityTypeUpdateInput,
): Promise<ActivityType | null> => {
  const assignments = buildUpdateAssignments(
    updates as Record<string, unknown>,
    ALLOWED_ACTIVITY_TYPE_UPDATE_KEYS,
  );
  if (!assignments) {
    const current = await pool.query(
      `SELECT * FROM activity_types WHERE id = $1 AND active = true`,
      [id],
    );
    return current.rows[0] || null;
  }

  const result = await pool.query(
    `UPDATE activity_types
    SET ${assignments.setClause}, updated_on = CURRENT_TIMESTAMP
    WHERE id = $${assignments.nextIndex} AND active = true
    RETURNING *`,
    [...assignments.values, id],
  );
  return result.rows[0] || null;
};

// Delete Activity Type
export const deleteActivityType = async (
  pool: Pool,
  id: string,
): Promise<ActivityType | null> => {
  const result = await pool.query(
    `UPDATE activity_types
    SET (active, updated_on) = (false, CURRENT_TIMESTAMP)
    WHERE id = $1
    RETURNING *`,
    [id],
  );
  return result.rows[0] || null;
};
