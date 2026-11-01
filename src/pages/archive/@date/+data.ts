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
        throw redirect("/");
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

    return { challenge };
}
