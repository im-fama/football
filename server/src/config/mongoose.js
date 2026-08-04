/**
 * Single shared mongoose instance.
 *
 * The loaders under `database/` and the API under `server/` live in different
 * npm workspaces. Importing "mongoose" from each would hand them two separate
 * copies of the driver - models registered on one would never see the other's
 * connection. Everything funnels through this module instead.
 */
import mongoose from "mongoose";

export default mongoose;
