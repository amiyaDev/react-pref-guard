import { withPerfGuard } from "react-perf-guard";
import { TestWrapper } from "./TestWrapper";

function FastComp() {
  return <div>Instant Render</div>;
}

export const Test10 = withPerfGuard(() => (
  <TestWrapper id="test_10">
    <FastComp />
  </TestWrapper>
));
