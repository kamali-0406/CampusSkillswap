import { initials } from '../utils/format';

export default function Avatar({ name, size = 40 }) {
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">{initials(name)}</span>;
}
