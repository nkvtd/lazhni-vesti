import { redirect, render } from "vike/abort";
import type { PageContextServer } from "vike/types";
import { getChallengeForClient } from "../../../database/drizzle/queries/challenges";
import { getSkopjeDateString } from "../../../database/drizzle/queries/util";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const playDate = pageContext.routeParams.date;
    const today = getSkopjeDateString();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(playDate)) {
        throw render(404, "Невалиден формат на датум.");
    }

    if (playDate === today) {
        throw redirect("/debrief");
    }

    if (playDate > today) {
        throw render(404, "Овој предизвик сè уште не е достапен.");
    }

    const challenge = await getChallengeForClient(
        pageContext.db,
        playDate,
        pageContext.user?.id,
    );

    if (!challenge) {
        throw render(404, "Нема архивиран предизвик за овој датум.");
    }

    if (!challenge.completed) {
        throw redirect(`/archive/${playDate}`);
    }

    // Free play has no Part 2: the +150 and the technique quiz are daily/Time Machine only.
    if (challenge.isFreePlay) {
        throw redirect(`/archive/${playDate}`);
    }

    return { challenge };
}
