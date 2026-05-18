import { router } from "../_core/trpc";
import { schedulesPortalRouter } from "./portalLider/schedules";
import { occurrencesRouter } from "./portalLider/occurrences";
import { attendanceRouter } from "./portalLider/attendance";
import { employeesPortalRouter } from "./portalLider/employees";
import { pixRouter } from "./portalLider/pix";

export const portalLiderRouter = router({
  ...schedulesPortalRouter._def.procedures,
  ...occurrencesRouter._def.procedures,
  ...attendanceRouter._def.procedures,
  ...employeesPortalRouter._def.procedures,
  ...pixRouter._def.procedures,
});
