import React from 'react';
import { CustomIcon, IconName, IconSize } from '../custom-icon/custom-icon';

const itemsPerPage = 5;

type PaginationProps = {
    currentPage: number;
    onPageChange: (page: number) => void;
    startIndex: number;
    endIndex: number;
    totalRows: number;
};

export function Pagination({ currentPage, onPageChange, startIndex, endIndex, totalRows }: PaginationProps) {
    const totalPages = Math.ceil(totalRows / itemsPerPage);

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    return (
        <div className="flex items-center justify-between bg-muted/40 px-4 py-3 rounded-b-lg">
            <div className="text-sm text-muted-foreground">
                {/* TODO(!): ADD THIS TO CONTEXT */}
                Showing {startIndex} to {endIndex} of {totalRows} entries
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className={`p-2 ${currentPage === 1 ? 'text-gray-400' : 'text-gray-700'} hover:text-gray-900 focus:outline-none`}
                >
                    <CustomIcon icon={IconName.CHEVRON_LEFT_ICON} size={IconSize.XS} />
                </button>
                <span className="text-sm text-gray-700">
                    {currentPage} / {totalPages}
                </span>
                <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className={`p-2 ${currentPage === totalPages ? 'text-gray-400' : 'text-gray-700'} hover:text-gray-900 focus:outline-none`}
                >
                    <CustomIcon icon={IconName.CHEVRON_RIGHT_ICON} size={IconSize.XS} />

                </button>
            </div>
        </div>

    );
}
