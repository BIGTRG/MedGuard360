import { z } from 'zod';

export const QuerySchema = z.object({
  actorUserId:     z.string().uuid().optional(),
  userId:          z.string().uuid().optional(),
  resource:        z.string().min(1).optional(),
  resourceType:    z.string().min(1).optional(),
  resourceId:      z.string().min(1).optional(),
  correlationId:   z.string().uuid().optional(),
  stateCode:       z.string().length(2).optional(),
  startDate:       z.string().datetime().optional(),
  from:            z.string().datetime().optional(),
  endDate:         z.string().datetime().optional(),
  to:              z.string().datetime().optional(),
  phiOnly:         z.enum(['true', 'false']).optional(),
  limit:           z.coerce.number().int().min(1).max(1000).optional(),
  offset:          z.coerce.number().int().min(0).optional(),
});