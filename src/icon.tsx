import type { SVGProps } from "react";
import type { IconName } from ".react-icons-svg-sprite/types";

type IconProps = {
  name: IconName;
  title?: string;
  size?: number;
} & SVGProps<SVGSVGElement>;

export default function Icon({ name, size, title, ...props }: IconProps) {
  const dimensions = !(props.height || props.width) && {
    height: size || 24,
    width: size || 24,
  };
  return (
    <svg {...dimensions} {...props}>
      <use href={`/sprite.__IMAGE_HASH__.svg#${name}`} />
      {title && <title>{title}</title>}
    </svg>
  );
}
