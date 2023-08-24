import type { SVGProps } from "react";
import type { IconName } from ".react-icons-svg-sprite/types";
// @ts-ignore
import spriteHref from ".react-icons-svg-sprite/sprite";

type IconProps = {
  name: IconName;
  size?: number;
} & SVGProps<SVGSVGElement>;

export default function Icon({ name, size, ...props }: IconProps) {
  const dimensions = !(props.height || props.width) && {
    height: size || 24,
    width: size || 24,
  };
  return (
    <svg {...dimensions} {...props}>
      <use href={`${spriteHref}#${name}`} />
    </svg>
  );
}
