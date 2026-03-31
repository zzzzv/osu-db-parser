export const osuDbStruct = [
    {name: 'osuver', type: 'int32'},
    {name: 'folder_count', type: 'int32'},
    {name: 'is_unlocked', type: 'boolean'},
    {name: 'date_unlock_ticks', type: 'int64'},
    {name: 'username', type: 'string'},
    {name: 'beatmaps_count', type: 'int32'},
    {name: 'beatmaps', type: 'beatmaps', uses: 'osuver,beatmaps_count'},
    {name: 'userperms', type: 'int32'}
]

export const collectionStruct = [
    {name: 'osuver', type: 'int32'},
    {name: 'collectionscount', type: 'int32'},
    {name: 'collection', type: 'collections', uses: 'collectionscount'}
]

const TARGET_PRACTICE_MOD = 1 << 23;

export const scoreStruct = [
    {name: 'mode', type: 'byte'},
    {name: 'version', type: 'int32'},
    {name: 'beatmap_md5', type: 'string'},
    {name: 'player_name', type: 'string'},
    {name: 'replay_md5', type: 'string'},
    {name: 'count_300', type: 'int16'},
    {name: 'count_100', type: 'int16'},
    {name: 'count_50', type: 'int16'},
    {name: 'count_geki', type: 'int16'},
    {name: 'count_katu', type: 'int16'},
    {name: 'count_miss', type: 'int16'},
    {name: 'total_score', type: 'int32'},
    {name: 'max_combo', type: 'int16'},
    {name: 'perfect_combo', type: 'boolean'},
    {name: 'mods', type: 'int32'},
    {name: 'empty_string', type: 'string'},
    {name: 'replay_timestamp', type: 'int64'},
    {name: 'sentinel', type: 'int32'},
    {name: 'online_score_id', type: 'int64'},
    {
        name: 'additional_mod_info',
        type: 'double',
        when: (context: Record<string, any>) => (Number(context.mods) & TARGET_PRACTICE_MOD) !== 0
    }
]

export const scoresBeatmapStruct = [
    {name: 'beatmap_md5', type: 'string'},
    {name: 'scores_count', type: 'int32'},
    {name: 'scores', type: 'array', countFrom: 'scores_count', items: scoreStruct}
]

export const scoresStruct = [
    {name: 'osuver', type: 'int32'},
    {name: 'beatmaps_count', type: 'int32'},
    {name: 'beatmaps', type: 'array', countFrom: 'beatmaps_count', items: scoresBeatmapStruct}
]