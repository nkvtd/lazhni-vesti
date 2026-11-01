import { eq } from "drizzle-orm";
import { Abort, getContext } from "telefunc";
import { user as userTable } from "../../database/drizzle/schema";

export async function onUpdateUsername(newName: string) {
    const { db, user } = getContext();
    if (!user) throw Abort("Мора да сте најавени.");

    const clean = newName.trim();
    if (clean.length < 3 || clean.length > 30) {
        throw Abort("Името мора да биде помеѓу 3 и 30 карактери.");
    }

    const [updated] = await db
        .update(userTable)
        .set({ name: clean, updatedAt: new Date() })
        .where(eq(userTable.id, user.id))
        .returning({ id: userTable.id, name: userTable.name });

    return updated;
}
