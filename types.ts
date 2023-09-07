import icons from "./icons_copy.json"

// rip

const ypu = (icons.icons[0]["name"]) as const;

let name: typeof icons.icons[0]["library"] = "oi"

type IconName<T> = T extends (infer U)[] ? U : T;

type IconValues = typeof icons['icons']

type IconNameUnion = IconName<IconValues[number]>;

// 'IconNameUnion' will be "xd" | "test" | "this_too"