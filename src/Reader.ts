/* Reader base from osu-packet! */
import { OsuReader } from 'osu-buffer';
import { osuDbStruct, collectionStruct, scoresStruct } from './Struct';

type LayoutContext = Record<string, any>;

type StructLayout = {
    name: string;
    type: string;
    uses?: string;
    countFrom?: string;
    items?: StructLayout[];
    when?: (context: LayoutContext) => boolean;
}

export class Reader {
    constructor() {
    }

    private buildContext(data: any = undefined): LayoutContext {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return {};
        }

        return data;
    }

    private readStructFields(reader: OsuReader, layout: StructLayout[], inheritedContext: LayoutContext = {}) {
        const data: Record<string, any> = {};

        for (const item of layout) {
            const context = {
                ...inheritedContext,
                ...data
            };

            if (item.when && !item.when(context)) {
                continue;
            }

            if (item.uses) {
                const requiredContext = item.uses.split(',').reduce<Record<string, any>>((carry, key) => {
                    carry[key] = context[key];
                    return carry;
                }, {});

                data[item.name] = this.Read(reader, item, requiredContext);
                continue;
            }

            data[item.name] = this.Read(reader, item, context);
        }

        return data;
    }

    /**
     * Reads a set of data from a buffer
     * @param {OsuBuffer} buff
     * @param {Object} layout
     * @param {null|Number|Boolean|Object|Array|String} requires
     * @param {Object|Array} data
     * @return {Object|Array}
     */
    Read(reader: OsuReader, layout: StructLayout, data: any = undefined) {
        const context = this.buildContext(data);

        switch (layout.type.toLowerCase()) {
            case 'int8':
                data = reader.readInt8();
                break;
            case 'uint8':
                data = reader.readUint8();
                break;
            case 'int16':
                data = reader.readInt16();
                break;
            case 'uint16':
                data = reader.readUint16();
                break;
            case 'int32':
                data = reader.readInt32();
                break;
            case 'uint32':
                data = reader.readUint32();
                break;
            case 'int64':
                data = reader.readInt64();
                break;
            case 'uint64':
                data = reader.readUint64();
                break;
            case 'string':
                data = reader.readString();
                break;
            case 'float':
                data = reader.readFloat();
                break;
            case 'double':
                data = reader.readDouble();
                break;
            case 'boolean':
                data = reader.readBoolean();
                break;
            case 'byte':
                data = reader.readUint8();
                break;
            case 'int32array': {
                const len = reader.readInt16();
                data = [];
                for (let i = 0; i < len; i++) {
                    data.push(reader.readInt32());
                }
                break;
            }
            case 'array': {
                const count = context[layout.countFrom || ''];

                if (typeof count !== 'number') {
                    throw new Error(`Missing array length for ${layout.name}`);
                }

                if (!layout.items) {
                    throw new Error(`Missing array item layout for ${layout.name}`);
                }

                data = [];
                for (let i = 0; i < count; i++) {
                    data.push(this.readStructFields(reader, layout.items, context));
                }
                break;
            }
            case "collections": {
                const collectionsCount = data['collectionscount'];
                data = [];
                for (let i = 0; i < collectionsCount; i++) {
                    const collection = {
                        'name': reader.readString(),
                        'beatmapsCount': reader.readInt32(),
                        'beatmapsMd5': []
                    }

                    for (let i = 0; i < collection['beatmapsCount']; i++) {
                        const bmmd5 = reader.readString();
                        // @ts-ignore
                        collection['beatmapsMd5'].push(bmmd5)
                    }

                    data.push(collection);
                }
                break;
            }
            case "beatmaps": {
                const osuver = data['osuver'];
                const beatmapscount = data['beatmaps_count'];
                data = [];
                for (let i = 0; i < beatmapscount; i++) {
                    if (osuver < 20191107) {
                        reader.readInt32(); // entry size xd
                    }
                    let beatmap = {
                        'artist_name': reader.readString(),
                        'artist_name_unicode': reader.readString(),
                        'song_title': reader.readString(),
                        'song_title_unicode': reader.readString(),
                        'creator_name': reader.readString(),
                        'difficulty': reader.readString(),
                        'audio_file_name': reader.readString(),
                        'md5': reader.readString(),
                        'osu_file_name': reader.readString(),
                        'ranked_status': reader.readUint8(),
                        'n_hitcircles': reader.readInt16(),
                        'n_sliders': reader.readInt16(),
                        'n_spinners': reader.readInt16(),
                        'last_modification_time': reader.readInt64()
                    }

                    if (osuver < 20140609) {
                        beatmap = {
                            ...beatmap,
                            // @ts-ignore
                            'approach_rate': reader.readUint8(),
                            'circle_size': reader.readUint8(),
                            'hp_drain': reader.readUint8(),
                            'overall_difficulty': reader.readUint8()
                        }
                    } else {
                        beatmap = {
                            ...beatmap,
                            // @ts-ignore
                            'approach_rate': reader.readFloat(),
                            'circle_size': reader.readFloat(),
                            'hp_drain': reader.readFloat(),
                            'overall_difficulty': reader.readFloat()
                        }
                    }

                    beatmap['slider_velocity'] = reader.readDouble()

                    if (osuver >= 20140609) {
                        const difficulties = []

                        for (let i = 0; i < 4; i++) {
                            const length = reader.readInt32()
                            const diffs = {}
                            for (let i = 0; i < length; i++) {
                                reader.readUint8()
                                const mode = reader.readInt32();
                                reader.readUint8()
                                const diff = osuver > 20250107 ? reader.readFloat() : reader.readDouble();
                                diffs[mode] = diff
                            }
                            // @ts-ignore
                            difficulties.push(diffs)
                        }

                        beatmap = {
                            ...beatmap,
                            // @ts-ignore
                            'star_rating_standard': difficulties[0],
                            'star_rating_taiko': difficulties[1],
                            'star_rating_ctb': difficulties[2],
                            'star_rating_mania': difficulties[3],
                        }
                    }

                    beatmap = {
                        ...beatmap,
                        // @ts-ignore
                        'drain_time': reader.readInt32(),
                        'total_time': reader.readInt32(),
                        'preview_offset': reader.readInt32(),
                    }

                    const timingPoints = [];
                    const timingPointsLength = reader.readInt32()
                    for (let i = 0; i < timingPointsLength; i++) {
                        // @ts-ignore
                        timingPoints.push([
                            reader.readDouble(), //BPM
                            reader.readDouble(), // offset
                            reader.readBoolean() // Boolean
                        ])
                    }

                    beatmap = {
                        ...beatmap,
                        // @ts-ignore
                        'beatmap_id': reader.readInt32(),
                        'beatmapset_id': reader.readInt32(),
                        'thread_id': reader.readInt32(),
                        'grade_standard': reader.readUint8(),
                        'grade_taiko': reader.readUint8(),
                        'grade_ctb': reader.readUint8(),
                        'grade_mania': reader.readUint8(),
                        'local_beatmap_offset': reader.readInt16(),
                        'stack_leniency': reader.readFloat(),
                        'timing_points': timingPoints,
                        'mode': reader.readUint8(),
                        'song_source': reader.readString(),
                        'song_tags': reader.readString(),
                        'online_offset': reader.readInt16(),
                        'title_font': reader.readString(),
                        'unplayed': reader.readBoolean(),
                        'last_played': reader.readInt64(),
                        'osz2': reader.readBoolean(),
                        'folder_name': reader.readString(),
                        'last_checked_against_repository': reader.readInt64(),
                        'ignore_sound': reader.readBoolean(),
                        'ignore_skin': reader.readBoolean(),
                        'disable_storyboard': reader.readBoolean(),
                        'disable_video': reader.readBoolean(),
                        'visual_override': reader.readBoolean()
                    }

                    if (osuver < 20140609) {
                        reader.readInt16()
                    }
                    beatmap['last_modification_time_2'] = reader.readInt32();

                    beatmap['mania_scroll_speed'] = reader.readUint8()

                    data.push(beatmap);
                }
                break;
            }
            default:
                throw new Error(`Unknown layout type: ${layout.type}`);
        }

        return data;
    }

    /**
     * Unmarshal's the buffer from the layout
     * @param {Buffer} raw
     * @param {Array|Object|Null} layout
     * @return {Object|Null}
     */
    UnmarshalPacket<T>(raw: Buffer, layout: typeof osuDbStruct | typeof collectionStruct | typeof scoresStruct): T {
        const arrayBuffer = raw.buffer instanceof ArrayBuffer
            ? raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
            : Uint8Array.from(raw).buffer;
        const reader = new OsuReader(arrayBuffer);
        return this.readStructFields(reader, layout as StructLayout[]) as T;
    }

}