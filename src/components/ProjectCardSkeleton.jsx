import FloatUpDiv from "./FloatUpDiv";
import Skeleton from "react-loading-skeleton";

const ProjectCardSkeleton = () => {
  return (
    <FloatUpDiv className="project-card">
      <Skeleton className="project-card-image" inline={true} />
      <Skeleton className="project-card-title" height={24} inline={true} />
      <Skeleton
        containerClassName="project-card-links"
        className="project-card-button"
        width={100}
        height={36}
        inline={true}
      />
    </FloatUpDiv>
  );
};

export default ProjectCardSkeleton;
