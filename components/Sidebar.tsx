"use client";

import Image from "next/image";
import React, { useState } from "react";
import iconHome from "@/public/svg/home.svg";
import iconTabler from "@/public/svg/icon-tabler.svg";
import iconTablerChevronDown from "@/public/svg/icon-tabler-chevron-down.svg";
import iconTablerChevronUp from "@/public/svg/icon-tabler-chevron-up.svg";
import iconTablerSearch from "@/public/svg/icon-tabler-search.svg";
import iconTablerBell from "@/public/svg/icon-tabler-bell.svg";
import iconTablerMessages from "@/public/svg/icon-tabler-messages.svg";
import sidebar1 from "@/public/svg/sidebar-1.svg";
import sidebar2 from "@/public/svg/sidebar-2.svg";
import sidebar3 from "@/public/svg/sidebar-3.svg";
import sidebar4 from "@/public/svg/sidebar-4.svg";

const Sidebar = () => {
  const [show, setShow] = useState(false);
  const [product, setProduct] = useState(false);
  const [deliverables, setDeliverables] = useState(false);

  return (
    <div
      className={
        show
          ? "w-full h-full absolute z-40 transform translate-x-0 "
          : "w-full h-full absolute z-40 transform translate-x-full"
      }
    >
      <div
        className="bg-gray-800 opacity-50 inset-0 fixed w-full h-full"
        onClick={() => setShow(!show)}
      />
      <div className="w-64 z-20 absolute left-0 z-40 top-0 bg-white shadow flex-col justify-between transition duration-150 ease-in-out h-full">
        <div className="flex flex-col justify-between h-full">
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Image
                  src={iconHome}
                  alt={"iconHome"}
                  height={40}
                  width={40}
                  aria-label="Home"
                />
                <p className="text-bold md:text2xl text-base pl-3 text-gray-800">
                  The North
                </p>
              </div>
              <div
                id="cross"
                className=" text-gray-800"
                onClick={() => setShow(!show)}
              >
                <Image
                  className="icon icon-tabler icon-tabler-x"
                  src={iconTabler}
                  alt={"icon-tabler"}
                  width="24"
                  height="24"
                />
              </div>
            </div>
            <ul className="f-m-m">
              <a>
                <li className="text-white pt-8">
                  <div className="flex items-center">
                    <div className="md:w-6 md:h-6 w-5 h-5">
                      <Image
                        src={sidebar1}
                        alt={"sidebar1"}
                        width={16}
                        height={16}
                      />
                    </div>
                    <p className="text-indigo-500 ml-3 text-lg">Dashboard</p>
                  </div>
                </li>
              </a>
              <a>
                <li className="text-gray-700 pt-8">
                  <div className="flex items-center">
                    <div className="flex items-center">
                      <div className="md:w-6 md:h-6 w-5 h-5">
                        <Image
                          src={sidebar2}
                          alt={"sidebar2"}
                          width={16}
                          height={16}
                        />
                      </div>
                      <p className="text-gray-700 ml-3 text-lg">Products</p>
                    </div>
                    <div onClick={() => setProduct(!product)}>
                      {product ? (
                        <div className=" ml-4">
                          <Image
                            src={iconTablerChevronUp}
                            alt={"icon-tabler-chevron-up"}
                            className="icon icon-tabler icon-tabler-chevron-up"
                            width={14}
                            height={14}
                          />
                        </div>
                      ) : (
                        <div className="ml-4">
                          <Image
                            src={iconTablerChevronDown}
                            alt={"icon-tabler-chevron-down"}
                            className="icon icon-tabler icon-tabler-chevron-down"
                            width={16}
                            height={16}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {product ? (
                    <div>
                      <ul className="my-3">
                        <li className="text-sm text-indigo-500 py-2 px-6">
                          Best Sellers
                        </li>
                        <li className="text-sm text-gray-800 hover:text-indigo-500 py-2 px-6">
                          Out of Stock
                        </li>
                        <li className="text-sm text-gray-800 hover:text-indigo-500 py-2 px-6">
                          New Products
                        </li>
                      </ul>
                    </div>
                  ) : (
                    ""
                  )}
                </li>
              </a>
              <a>
                <li className="text-gray-800 pt-8">
                  <div className="flex items-center">
                    <div className="md:w-6 md:h-6 w-5 h-5">
                      <Image
                        src={sidebar3}
                        alt={"sidebar3"}
                        width={16}
                        height={16}
                      />
                    </div>
                    <p className="text-gray-800 ml-3 text-lg">Performance</p>
                  </div>
                </li>
              </a>
              <a>
                <li className="text-gray-800 pt-8">
                  <div className="flex items-center">
                    <div className="flex items-center">
                      <div className="md:w-6 md:h-6 w-5 h-5">
                        <Image
                          src={sidebar4}
                          alt={"sidebar4"}
                          width={16}
                          height={16}
                        />
                      </div>
                      <p className="text-gray-800 ml-3 text-lg">Deliverables</p>
                    </div>
                    <div onClick={() => setDeliverables(!deliverables)}>
                      {deliverables ? (
                        <div className=" ml-4">
                          <Image
                            src={iconTablerChevronUp}
                            alt={"icon-tabler-chevron-up"}
                            className="icon icon-tabler icon-tabler-chevron-up"
                            width={14}
                            height={14}
                          />
                        </div>
                      ) : (
                        <div className="ml-4">
                          <Image
                            src={iconTablerChevronDown}
                            alt={"icon-tabler-chevron-down"}
                            className="icon icon-tabler icon-tabler-chevron-down"
                            width={16}
                            height={16}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {deliverables ? (
                    <div>
                      <ul className="my-3">
                        <li className="text-sm text-indigo-500 py-2 px-6">
                          Best Sellers
                        </li>
                        <li className="text-sm text-gray-800 hover:text-indigo-500 py-2 px-6">
                          Out of Stock
                        </li>
                        <li className="text-sm text-gray-800 hover:text-indigo-500 py-2 px-6">
                          New Products
                        </li>
                      </ul>
                    </div>
                  ) : (
                    ""
                  )}
                </li>
              </a>
            </ul>
          </div>
          <div className="w-full">
            <div className="flex justify-center mb-4 w-full px-6">
              <div className="relative w-full">
                <div className="text-gray-500 absolute ml-4 inset-0 m-auto w-4 h-4">
                  <Image
                    src={iconTablerSearch}
                    alt={"icon-tabler-search"}
                    className="icon icon-tabler icon-tabler-search"
                    width={16}
                    height={16}
                  />
                </div>
                <input
                  className="bg-gray-100 focus:outline-none rounded w-full text-sm text-gray-500 bg-gray-100 pl-10 py-2"
                  type="text"
                  placeholder="Search"
                />
              </div>
            </div>
            <div className="border-t border-gray-300">
              <div className="w-full flex items-center justify-between px-6 pt-1">
                <div className="flex items-center">
                  <Image
                    width={50}
                    height={50}
                    alt="profile-pic"
                    src="https://tuk-cdn.s3.amazonaws.com/assets/components/boxed_layout/bl_1.png"
                    className="w-8 h-8 rounded-md"
                  />
                  <p className=" text-gray-800 text-base leading-4 ml-2">
                    TopGear Doe
                  </p>
                </div>
                <ul className="flex">
                  <li className="cursor-pointer text-white pt-5 pb-3">
                    <Image
                      src={iconTablerMessages}
                      alt={"icon-tabler-messages"}
                      className="icon icon-tabler icon-tabler-messages"
                      width={24}
                      height={24}
                    />
                  </li>
                  <li className="cursor-pointer text-white pt-5 pb-3 pl-3">
                    <Image
                      src={iconTablerBell}
                      alt={"icon-tabler-bell"}
                      className="icon icon-tabler icon-tabler-bell"
                      width={28}
                      height={28}
                    />
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
