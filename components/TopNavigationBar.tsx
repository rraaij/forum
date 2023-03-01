"use client";

import Image from "next/image";
import React, { useState } from "react";
import iconHome from "@/public/svg/home.svg";
import iconTablerChevronDown from "@/public/svg/icon-tabler-chevron-down.svg";
import iconTablerMenu2 from "@/public/svg/icon-tabler-menu-2.svg";
import iconTablerBell from "@/public/svg/icon-tabler-bell.svg";
import iconTablerUser from "@/public/svg/icon-tabler-user.svg";
import iconTablerHelp from "@/public/svg/icon-tabler-help.svg";
import iconTablerSettings from "@/public/svg/icon-tabler-settings.svg";

const TopNavigationBar = () => {
  const [show, setShow] = useState(false);
  const [product, setProduct] = useState(false);
  const [deliverables, setDeliverables] = useState(false);
  const [profile, setProfile] = useState(false);

  return (
    <nav className="w-full mx-auto bg-white shadow relative z-20">
      <div className="justify-between container px-6 h-16 flex items-center lg:items-stretch mx-auto">
        <div className="flex items-center">
          <div className="mr-10 flex items-center">
            <Image
              src={iconHome}
              alt={"iconHome"}
              height={40}
              width={40}
              aria-label="Home"
            />
            <h3 className="text-base text-gray-800 font-bold tracking-normal leading-tight ml-3 hidden lg:block">
              The North
            </h3>
          </div>
          <ul className="pr-32 xl:flex hidden items-center h-full">
            <li className="hover:text-indigo-700 cursor-pointer h-full flex items-center text-sm text-indigo-700 tracking-normal">
              Dashboard
            </li>
            <li className="hover:text-indigo-700 cursor-pointer h-full flex items-center text-sm text-gry-800 mx-10 tracking-normal relative">
              {product ? (
                <ul className="bg-white shadow rounded py-1 w-32 left-0 mt-16 -ml-4 absolute  top-0">
                  <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-3 hover:bg-indigo-700 px-3 font-normal">
                    Landing Pages
                  </li>
                  <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-3 hover:bg-indigo-700 px-3 font-normal">
                    Templates
                  </li>
                  <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-3 hover:bg-indigo-700 px-3 font-normal">
                    Components
                  </li>
                </ul>
              ) : (
                ""
              )}
              Products
              <span className="ml-2" onClick={() => setProduct(!product)}>
                <Image
                  src={iconTablerChevronDown}
                  alt={"icon-tabler-chevron-down"}
                  className="icon icon-tabler icon-tabler-chevron-down"
                  width={16}
                  height={16}
                />
              </span>
            </li>
            <li className="hover:text-indigo-700 cursor-pointer h-full flex items-center text-sm text-gry-800 mr-10 tracking-normal">
              Performance
            </li>
            <li className="hover:text-indigo-700 cursor-pointer h-full flex items-center text-sm text-gray-800 tracking-normal relative">
              {deliverables ? (
                <ul className="bg-white shadow rounded py-1 w-32 left-0 mt-16 -ml-4 absolute  top-0">
                  <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-3 hover:bg-indigo-700 px-3 font-normal">
                    Landing Pages
                  </li>
                  <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-3 hover:bg-indigo-700 px-3 font-normal">
                    Templates
                  </li>
                  <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-3 hover:bg-indigo-700 px-3 font-normal">
                    Components
                  </li>
                </ul>
              ) : (
                ""
              )}
              Deliverables
              <span
                className="ml-2"
                onClick={() => setDeliverables(!deliverables)}
              >
                <Image
                  src={iconTablerChevronDown}
                  alt={"icon-tabler-chevron-down"}
                  className="icon icon-tabler icon-tabler-chevron-down"
                  width={16}
                  height={16}
                />
              </span>
            </li>
          </ul>
        </div>
        <div className="h-full xl:flex hidden items-center justify-end">
          <div className="h-full flex items-center">
            <div className="w-32 pr-16 h-full flex items-center justify-end border-r" />
            <div className="w-full h-full flex">
              <div className="w-16 xl:w-32 h-full flex items-center justify-center xl:border-r">
                <div className="relative">
                  <div className="cursor-pointer w-6 h-6 xl:w-auto xl:h-auto text-gray-600">
                    <Image
                      src={iconTablerBell}
                      alt={"icon-tabler-bell"}
                      className="icon icon-tabler icon-tabler-bell"
                      width={28}
                      height={28}
                    />
                  </div>
                  <div className="animate-ping w-2 h-2 rounded-full bg-red-400 border border-white absolute inset-0 mt-1 mr-1 m-auto" />
                </div>
              </div>
              <div
                aria-haspopup="true"
                className="cursor-pointer w-full flex items-center justify-end relative"
                onClick={() => setProfile(!profile)}
              >
                {profile ? (
                  <ul className="p-2 w-40 border-r bg-white absolute rounded z-40 left-0 shadow mt-64 ">
                    <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-2 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none">
                      <div className="flex items-center">
                        <Image
                          src={iconTablerUser}
                          alt={"icon-tabler-user"}
                          className="icon icon-tabler icon-tabler-user"
                          width={20}
                          height={20}
                        />
                        <span className="ml-2">My Profile</span>
                      </div>
                    </li>
                    <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal mt-2 py-2 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none flex items-center">
                      <Image
                        src={iconTablerHelp}
                        alt={"icon-tabler-help"}
                        className="icon icon-tabler icon-tabler-help"
                        width={20}
                        height={20}
                      />
                      <span className="ml-2">Help Center</span>
                    </li>
                    <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal mt-2 py-2 hover:text-indigo-700 flex items-center focus:text-indigo-700 focus:outline-none">
                      <Image
                        src={iconTablerSettings}
                        alt={"icon-tabler-settings"}
                        className="icon icon-tabler icon-tabler-settings"
                        width={20}
                        height={20}
                      />
                      <span className="ml-2">Account Settings</span>
                    </li>
                  </ul>
                ) : (
                  ""
                )}
                <Image
                  width={50}
                  height={50}
                  className="rounded-full h-10 w-10 object-cover"
                  src="https://tuk-cdn.s3.amazonaws.com/assets/components/sidebar_layout/sl_1.png"
                  alt="avatar"
                />
                <p className="text-gray-800 text-sm ml-2">Jane Doe</p>
              </div>
            </div>
          </div>
        </div>
        <div className="visible xl:hidden flex items-center">
          <div>
            <div
              id="menu"
              className="text-gray-800"
              onClick={() => setShow(!show)}
            >
              <Image
                src={iconTablerMenu2}
                alt={"icon-tabler-menu-2"}
                className="icon icon-tabler icon-tabler-menu-2"
                width={24}
                height={24}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNavigationBar;
