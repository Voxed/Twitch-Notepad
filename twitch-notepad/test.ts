// To parse this data:
//
//   import { Convert, Test } from "./file";
//
//   const test = Convert.toTest(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface Test {
    data:    Data | null;
    errors?: Error[];
}

export interface Data {
    users: UserQuery;
}

export interface UserQuery {
    user: User | null;
}

export interface User {
    style: UserStyle;
}

export interface UserStyle {
    activeEmoteSet: EmoteSet | null;
}

export interface EmoteSet {
    emotes: EmoteSetEmoteSearchResult;
}

export interface EmoteSetEmoteSearchResult {
    items: EmoteSetEmote[];
}

export interface EmoteSetEmote {
    alias: string;
    emote: Emote;
}

export interface Emote {
    images:      Image[];
    defaultName: string;
    flags:       EmoteFlags;
}

export interface EmoteFlags {
    animated: boolean;
}

export interface Image {
    height:     number;
    width:      number;
    url:        string;
    scale:      number;
    mime:       string;
    size:       number;
    frameCount: number;
}

export interface Error {
    message: string;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toTest(json: string): Test {
        return cast(JSON.parse(json), r("Test"));
    }

    public static testToJson(value: Test): string {
        return JSON.stringify(uncast(value, r("Test")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "Test": o([
        { json: "data", js: "data", typ: u(r("Data"), null) },
        { json: "errors", js: "errors", typ: u(undefined, a(r("Error"))) },
    ], false),
    "Data": o([
        { json: "users", js: "users", typ: r("UserQuery") },
    ], false),
    "UserQuery": o([
        { json: "user", js: "user", typ: u(r("User"), null) },
    ], false),
    "User": o([
        { json: "style", js: "style", typ: r("UserStyle") },
    ], false),
    "UserStyle": o([
        { json: "activeEmoteSet", js: "activeEmoteSet", typ: u(r("EmoteSet"), null) },
    ], false),
    "EmoteSet": o([
        { json: "emotes", js: "emotes", typ: r("EmoteSetEmoteSearchResult") },
    ], false),
    "EmoteSetEmoteSearchResult": o([
        { json: "items", js: "items", typ: a(r("EmoteSetEmote")) },
    ], false),
    "EmoteSetEmote": o([
        { json: "alias", js: "alias", typ: "" },
        { json: "emote", js: "emote", typ: r("Emote") },
    ], false),
    "Emote": o([
        { json: "images", js: "images", typ: a(r("Image")) },
        { json: "defaultName", js: "defaultName", typ: "" },
        { json: "flags", js: "flags", typ: r("EmoteFlags") },
    ], false),
    "EmoteFlags": o([
        { json: "animated", js: "animated", typ: true },
    ], false),
    "Image": o([
        { json: "height", js: "height", typ: 0 },
        { json: "width", js: "width", typ: 0 },
        { json: "url", js: "url", typ: "" },
        { json: "scale", js: "scale", typ: 0 },
        { json: "mime", js: "mime", typ: "" },
        { json: "size", js: "size", typ: 0 },
        { json: "frameCount", js: "frameCount", typ: 0 },
    ], false),
    "Error": o([
        { json: "message", js: "message", typ: "" },
    ], false),
};
