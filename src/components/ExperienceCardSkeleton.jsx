import FloatUpDiv from './FloatUpDiv';
import Skeleton from 'react-loading-skeleton';

const ExperienceCardSkeleton = () => {
  return (
    <FloatUpDiv className='experience-card'>
      <Skeleton className='experience-card-title' height={24} inline={true} />
      <Skeleton className='experience-card-subtitle' width={150} height={24} inline={true} />
      <div className='experience-card-list'>
        <Skeleton className='experience-card-item-skeleton' count={3} height={24} inline={true} />
        <Skeleton className='experience-card-item-skeleton' width={250} height={24} inline={true} />
      </div>
      <Skeleton
        containerClassName='experience-card-links'
        className='experience-card-button'
        width={100}
        height={36}
        inline={true}
      />
    </FloatUpDiv>
  );
};

export default ExperienceCardSkeleton;
